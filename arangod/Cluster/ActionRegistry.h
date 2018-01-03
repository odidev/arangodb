////////////////////////////////////////////////////////////////////////////////
/// DISCLAIMER
///
/// Copyright 2014-2016 ArangoDB GmbH, Cologne, Germany
/// Copyright 2004-2014 triAGENS GmbH, Cologne, Germany
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///
/// Copyright holder is ArangoDB GmbH, Cologne, Germany
///
/// @author Kaveh Vahedipour
/// @author Matthew Von-Maszewski
////////////////////////////////////////////////////////////////////////////////

#ifndef ARANGODB_MAINTENANCE_MAINTENANCE_H
#define ARANGODB_MAINTENANCE_MAINTENANCE_H

#include "Cluster/ActionDescription.h"

#include "Basics/Result.h"
#include "Basics/ReadWriteLock.h"

namespace arangodb {
namespace maintenance {

class Action;

/// @brief Action registry singleton 
class ActionRegistry {

public:

  /// @brief construct
  ActionRegistry();

  /// @brief clean up
  ~ActionRegistry();

  /// @brief public access to instance
  ActionRegistry* Instance();

  /// @brief dispatch action through registry
  arangodb::Result dispatch (ActionDescription const&, std::shared_ptr<Action>&);

  /// @brief get a dispatched action
  std::shared_ptr<Action> get (ActionDescription const&);
  
  /// @brief get a dispatched action
  std::shared_ptr<Action> kill (ActionDescription const&, Signal const& signal);
  
private:

  /// @brief single instance
  static ActionRegistry* _instance;

  /// @brief registry
  std::unordered_map<ActionDescription, std::shared_ptr<Action>> _registry;

  /// @brief Read write lock to guard access to _registry
  mutable arangodb::basics::ReadWriteLock _registryLock;
  
};

}}

#endif